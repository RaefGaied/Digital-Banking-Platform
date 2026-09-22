package com.fintech.banking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.TaskService;
import org.flowable.engine.HistoryService;
import org.flowable.engine.history.HistoricActivityInstance;
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

    public Map<String, Object> getProcessVariables(String processInstanceId) {
        if (processInstanceId == null) return java.util.Map.of();
        if (runtimeService == null) return java.util.Map.of();
        return runtimeService.getVariables(processInstanceId);
    }

    public List<Map<String, Object>> getProcessTrace(String processInstanceId) {
        if (processInstanceId == null) {
            return List.of();
        }
        if (historyService == null) {
            return fallbackTrace();
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
            return fallbackTrace();
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

    private List<Map<String, Object>> fallbackTrace() {
        List<Map<String, Object>> fallback = new java.util.ArrayList<>();
        String[] stages = {"Request received", "Automated validation", "Human decision", "Execution"};
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
            fallback.add(entry);
        }
        return fallback;
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
