package com.fintech.banking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.bpmn.model.BpmnModel;
import org.flowable.bpmn.model.EndEvent;
import org.flowable.bpmn.model.FlowElement;
import org.flowable.bpmn.model.Gateway;
import org.flowable.bpmn.model.ServiceTask;
import org.flowable.bpmn.model.StartEvent;
import org.flowable.bpmn.model.UserTask;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.TaskService;
import org.flowable.engine.HistoryService;
import org.flowable.engine.history.HistoricActivityInstance;
import org.flowable.engine.history.HistoricProcessInstance;
import org.flowable.variable.api.history.HistoricVariableInstance;
import org.flowable.common.engine.api.FlowableObjectNotFoundException;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlowableService {

    private final NotificationService notificationService;

    @Autowired(required = false)
    private RuntimeService runtimeService;

    @Autowired(required = false)
    private TaskService taskService;

    @Autowired(required = false)
    private RepositoryService repositoryService;

    @Autowired(required = false)
    private HistoryService historyService;

    public String startProcessInstance(String processKey, Map<String, Object> variables) {
        if (runtimeService == null) {
            throw new IllegalStateException("Flowable RuntimeService is not available");
        }
        if (repositoryService == null) {
            throw new IllegalStateException("Flowable RepositoryService is not available");
        }
        long definitionCount = repositoryService.createProcessDefinitionQuery()
                .processDefinitionKey(processKey)
                .active()
                .count();
        if (definitionCount == 0) {
            throw new IllegalStateException("No active BPMN process definition found for key: " + processKey);
        }
        ProcessInstance instance = runtimeService.startProcessInstanceByKey(processKey, variables);
        if (instance != null) {
            notificationService.notifyAdminsWorkflowStarted(instance.getId(), processKey);
        }
        return instance == null ? null : instance.getId();
    }

    public boolean isAvailable() {
        return runtimeService != null && taskService != null && repositoryService != null;
    }

    public List<Map<String, Object>> listProcessDefinitions() {
        if (repositoryService == null) {
            return List.of();
        }
        return repositoryService.createProcessDefinitionQuery()
                .active()
                .orderByProcessDefinitionKey()
                .asc()
                .list()
                .stream()
                .map(definition -> Map.<String, Object>of(
                        "key", definition.getKey(),
                        "name", definition.getName(),
                        "version", definition.getVersion(),
                        "deploymentId", definition.getDeploymentId()))
                .toList();
    }

    public List<Task> listAdminTasks() {
        if (taskService == null) {
            return List.of();
        }
        return taskService.createTaskQuery()
                .taskCandidateGroup("admin")
                .orderByTaskCreateTime()
                .desc()
                .list();
    }

    public void completeTask(String taskId, Map<String, Object> variables) {
        if (taskService == null) {
            throw new IllegalStateException("Flowable TaskService is not available");
        }
        taskService.complete(taskId, variables);
    }

    public Task getTaskById(String taskId) {
        if (taskService == null) {
            return null;
        }
        return taskService.createTaskQuery().taskId(taskId).singleResult();
    }

    public Task getActiveTask(String processInstanceId, String taskDefinitionKey) {
        if (taskService == null || processInstanceId == null || taskDefinitionKey == null) {
            return null;
        }
        return taskService.createTaskQuery()
                .processInstanceId(processInstanceId)
                .taskDefinitionKey(taskDefinitionKey)
                .singleResult();
    }

    public Map<String, Object> getProcessVariables(String processInstanceId) {
        if (processInstanceId == null) return java.util.Map.of();
        if (runtimeService != null) {
            try {
                return runtimeService.getVariables(processInstanceId);
            } catch (FlowableObjectNotFoundException ignored) {
                log.debug("Runtime process {} is no longer active; reading historic variables", processInstanceId);
            }
        }
        if (historyService == null) return java.util.Map.of();
        return historyService.createHistoricVariableInstanceQuery()
                .processInstanceId(processInstanceId)
                .list()
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        HistoricVariableInstance::getVariableName,
                        HistoricVariableInstance::getValue,
                        (first, latest) -> latest,
                        java.util.LinkedHashMap::new));
    }

    public List<Map<String, Object>> getProcessTrace(String processInstanceId) {
        if (processInstanceId == null) {
            return List.of();
        }
        if (historyService == null) {
            return fallbackTrace(processInstanceId);
        }
        List<Map<String, Object>> trace = historyService.createHistoricActivityInstanceQuery()
                .processInstanceId(processInstanceId)
                .orderByHistoricActivityInstanceStartTime()
                .asc()
                .list()
                .stream()
                .map(this::toTraceEntry)
                .toList();

        // A process created before full history was enabled can have variables and
        // an active task but no historic activity rows. Expose that live task so the
        // supervision panel remains actionable instead of appearing broken.
        if (!trace.isEmpty() || taskService == null) {
            return trace;
        }
        Task activeTask = taskService.createTaskQuery()
                .processInstanceId(processInstanceId)
                .singleResult();
        if (activeTask == null) {
            return fallbackTrace(processInstanceId);
        }
        Map<String, Object> liveEntry = new java.util.LinkedHashMap<>();
        liveEntry.put("activityId", "live-" + activeTask.getId());
        liveEntry.put("activityName", activeTask.getName() == null ? "Current workflow task" : activeTask.getName());
        liveEntry.put("activityType", "userTask");
        liveEntry.put("taskId", activeTask.getId());
        liveEntry.put("assignee", activeTask.getAssignee());
        liveEntry.put("startTime", activeTask.getCreateTime());
        liveEntry.put("endTime", null);
        liveEntry.put("completed", false);
        return List.of(liveEntry);
    }

    public List<Map<String, Object>> getProcessInstances(int page, int size) {
        if (historyService == null) {
            return List.of();
        }
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        return historyService.createHistoricProcessInstanceQuery()
                .orderByProcessInstanceStartTime()
                .desc()
                .listPage(safePage * safeSize, safeSize)
                .stream()
                .map(this::toProcessInstanceEntry)
                .toList();
    }

    public long getProcessInstanceCount() {
        return historyService == null
                ? 0
                : historyService.createHistoricProcessInstanceQuery().count();
    }

    public Map<String, Object> getProcessInstanceDetails(String processInstanceId) {
        Map<String, Object> details = new java.util.LinkedHashMap<>();
        details.put("processInstanceId", processInstanceId);
        details.put("variables", getProcessVariables(processInstanceId));
        return details;
    }

    private Map<String, Object> toProcessInstanceEntry(HistoricProcessInstance instance) {
        Map<String, Object> entry = new java.util.LinkedHashMap<>();
        entry.put("id", instance.getId());
        entry.put("processDefinitionId", instance.getProcessDefinitionId());
        entry.put("businessKey", instance.getBusinessKey());
        entry.put("startedAt", instance.getStartTime());
        entry.put("endedAt", instance.getEndTime());
        entry.put("endActivityId", instance.getEndActivityId());
        entry.put("deleteReason", instance.getDeleteReason());
        entry.put("active", instance.getEndTime() == null && instance.getDeleteReason() == null);
        if (repositoryService != null) {
            var definition = repositoryService.createProcessDefinitionQuery()
                    .processDefinitionId(instance.getProcessDefinitionId())
                    .singleResult();
            if (definition != null) {
                entry.put("processDefinitionKey", definition.getKey());
                entry.put("processDefinitionName", definition.getName());
            }
        }
        if (taskService != null) {
            Task activeTask = taskService.createTaskQuery()
                    .processInstanceId(instance.getId())
                    .singleResult();
            if (activeTask != null) {
                entry.put("activeTaskId", activeTask.getId());
                entry.put("activeTaskName", activeTask.getName());
            }
        }
        return entry;
    }

    private List<Map<String, Object>> fallbackTrace(String processInstanceId) {
        String processDefinitionKey = null;
        String processDefinitionId = null;
        if (runtimeService != null && repositoryService != null) {
            ProcessInstance instance = runtimeService.createProcessInstanceQuery()
                    .processInstanceId(processInstanceId)
                    .singleResult();
            if (instance != null) {
                processDefinitionId = instance.getProcessDefinitionId();
            }
        }
        if (processDefinitionId == null && historyService != null) {
            var historicInstance = historyService.createHistoricProcessInstanceQuery()
                    .processInstanceId(processInstanceId)
                    .singleResult();
            if (historicInstance != null) {
                processDefinitionId = historicInstance.getProcessDefinitionId();
            }
        }
        if (processDefinitionId != null && repositoryService != null) {
            var definition = repositoryService.createProcessDefinitionQuery()
                    .processDefinitionId(processDefinitionId)
                    .singleResult();
            if (definition != null) {
                processDefinitionKey = definition.getKey();
                List<Map<String, Object>> modelTrace = modelTrace(processDefinitionId);
                if (!modelTrace.isEmpty()) {
                    return modelTrace;
                }
            }
        }
        Map<String, Object> variables = getProcessVariables(processInstanceId);
        boolean dataUpdate = (processDefinitionKey != null && processDefinitionKey.contains("dataUpdate"))
                || "UPDATE_SENSITIVE_DATA".equals(String.valueOf(variables.get("intent")));
        String[] stages = dataUpdate
                ? new String[]{"Data Update Initiated", "Vérifier la modification de données", "Decision", "Enregistrer audit log", "Approved / Rejected"}
                : new String[]{"Request received", "Automated validation", "Human decision", "Execution"};
        List<Map<String, Object>> fallback = new java.util.ArrayList<>();
        for (int index = 0; index < stages.length; index++) {
            Map<String, Object> entry = new java.util.LinkedHashMap<>();
            entry.put("activityId", "workflow-stage-" + index);
            entry.put("activityName", stages[index]);
            entry.put("activityType", "workflowStage");
            entry.put("taskId", null);
            entry.put("assignee", null);
            entry.put("startTime", null);
            entry.put("endTime", null);
            entry.put("completed", false);
            entry.put("synthetic", true);
            entry.put("source", "process-model");
            fallback.add(entry);
        }
        return fallback;
    }

    private List<Map<String, Object>> modelTrace(String processDefinitionId) {
        BpmnModel model = repositoryService.getBpmnModel(processDefinitionId);
        if (model == null || model.getMainProcess() == null) {
            return List.of();
        }
        return model.getMainProcess().getFlowElements().stream()
                .filter(element -> element instanceof StartEvent
                        || element instanceof EndEvent
                        || element instanceof UserTask
                        || element instanceof ServiceTask
                        || element instanceof Gateway)
                .map(this::toModelTraceEntry)
                .toList();
    }

    private Map<String, Object> toModelTraceEntry(FlowElement element) {
        Map<String, Object> entry = new java.util.LinkedHashMap<>();
        entry.put("activityId", "model-" + element.getId());
        entry.put("activityName", element.getName() == null || element.getName().isBlank()
                ? element.getId()
                : element.getName());
        entry.put("activityType", elementType(element));
        entry.put("taskId", null);
        entry.put("assignee", null);
        entry.put("startTime", null);
        entry.put("endTime", null);
        entry.put("completed", false);
        entry.put("synthetic", true);
        entry.put("source", "process-model");
        return entry;
    }

    private String elementType(FlowElement element) {
        if (element instanceof StartEvent) return "startEvent";
        if (element instanceof EndEvent) return "endEvent";
        if (element instanceof UserTask) return "userTask";
        if (element instanceof ServiceTask) return "serviceTask";
        if (element instanceof Gateway) return "gateway";
        return "flowNode";
    }

    private Map<String, Object> toTraceEntry(HistoricActivityInstance activity) {
        Map<String, Object> entry = new java.util.LinkedHashMap<>();
        entry.put("activityId", activity.getActivityId());
        entry.put("activityName", activity.getActivityName());
        entry.put("activityType", activity.getActivityType());
        entry.put("taskId", activity.getTaskId());
        entry.put("assignee", activity.getAssignee());
        entry.put("startTime", activity.getStartTime());
        entry.put("endTime", activity.getEndTime());
        entry.put("completed", activity.getEndTime() != null);
        return entry;
    }
}
