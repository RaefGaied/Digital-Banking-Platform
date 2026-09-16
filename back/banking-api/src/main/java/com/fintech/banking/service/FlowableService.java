package com.fintech.banking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.TaskService;
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
}
