package com.fintech.banking.controller;

import com.fintech.banking.service.FlowableService;
import com.fintech.banking.service.FlowableTaskCompletionService;
import org.flowable.task.api.Task;
import org.springframework.http.ResponseEntity;
import com.fintech.banking.dto.response.PageResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/flowable")
public class FlowableAdminController {

    private final FlowableService flowableService;
    private final FlowableTaskCompletionService flowableTaskCompletionService;

    public FlowableAdminController(FlowableService flowableService, FlowableTaskCompletionService flowableTaskCompletionService) {
        this.flowableService = flowableService;
        this.flowableTaskCompletionService = flowableTaskCompletionService;
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<Map<String, Object>>> listTasks() {
        List<Task> tasks = flowableService.listAdminTasks();
        List<Map<String, Object>> dto = tasks.stream().map(t -> {
            java.util.Map<String,Object> m = new java.util.HashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("taskDefinitionKey", t.getTaskDefinitionKey());
            m.put("assignee", t.getAssignee());
            m.put("createdTime", t.getCreateTime());
            m.put("processInstanceId", t.getProcessInstanceId());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/processes")
    public ResponseEntity<PageResponse<Map<String, Object>>> listProcesses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        List<Map<String, Object>> processes = flowableService.getProcessInstances(safePage, safeSize);
        long total = flowableService.getProcessInstanceCount();
        int totalPages = (int) Math.ceil((double) total / safeSize);
        boolean last = safePage + 1 >= totalPages;
        return ResponseEntity.ok(new PageResponse<>(processes, safePage, safeSize, total, totalPages, last));
    }

    @GetMapping("/processes/{processInstanceId}")
    public ResponseEntity<Map<String, Object>> processDetails(@PathVariable String processInstanceId) {
        return ResponseEntity.ok(flowableService.getProcessInstanceDetails(processInstanceId));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
                "available", flowableService.isAvailable(),
                "processDefinitions", flowableService.listProcessDefinitions()));
    }

    @GetMapping("/processes/{processInstanceId}/trace")
    public ResponseEntity<List<Map<String, Object>>> processTrace(@PathVariable String processInstanceId) {
        return ResponseEntity.ok(flowableService.getProcessTrace(processInstanceId));
    }

    @PostMapping("/tasks/{taskId}/complete")
    public ResponseEntity<?> completeTask(@PathVariable String taskId, @RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(flowableTaskCompletionService.completeTask(taskId, body));
        } catch (Exception e) {
            // log but don't expose
            org.slf4j.LoggerFactory.getLogger(FlowableAdminController.class).error("Error handling task completion actions", e);
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Failed to complete task"));
        }
    }
}
