package com.fintech.banking.service;

import lombok.RequiredArgsConstructor;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FlowableService {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RuntimeService runtimeService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private TaskService taskService;

    public String startProcessInstance(String processKey, Map<String, Object> variables) {
        if (runtimeService == null) {
            throw new IllegalStateException("Flowable RuntimeService is not available");
        }
        ProcessInstance instance = runtimeService.startProcessInstanceByKey(processKey, variables);
        return instance == null ? null : instance.getId();
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
