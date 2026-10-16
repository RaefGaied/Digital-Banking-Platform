package com.fintech.banking.flowable;

import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FlowableDeploymentIntegrationTest extends FlowableRuntimeTestSupport {

    @Autowired
    private RepositoryService repositoryService;

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "ADMIN")
    void engineDeploysDefinitionsAndAdminApiReportsThem() throws Exception {
        assertThat(repositoryService.createProcessDefinitionQuery().active().count()).isGreaterThanOrEqualTo(3);
        Set<String> keys = repositoryService.createProcessDefinitionQuery()
                .active()
                .list()
                .stream()
                .map(definition -> definition.getKey())
                .collect(Collectors.toSet());
        assertThat(keys).contains(
                "transferValidationProcess",
                "fraudValidationProcess",
                "dataUpdateValidationProcess");

        mockMvc.perform(get("/admin/flowable/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.processDefinitions.length()").value(3));
    }

    @Test
    void processStartCreatesLiveTaskAndCompletingItAdvancesTheActualEngine() {
        String userId = UUID.randomUUID().toString();
        ProcessInstance process = runtimeService.startProcessInstanceByKey(
                "dataUpdateValidationProcess",
                Map.of("userId", userId, "infoCount", 0));

        try {
            Task proofTask = taskService.createTaskQuery()
                    .processInstanceId(process.getId())
                    .singleResult();
            assertThat(proofTask).isNotNull();
            assertThat(proofTask.getTaskDefinitionKey()).isEqualTo("taskFournirPreuve");
            assertThat(proofTask.getAssignee()).isEqualTo(userId);

            taskService.complete(proofTask.getId(), Map.of(
                    "identityDocumentProvided", true,
                    "identityDocumentName", "proof.pdf"));

            Task adminTask = taskService.createTaskQuery()
                    .processInstanceId(process.getId())
                    .singleResult();
            assertThat(adminTask).isNotNull();
            assertThat(adminTask.getTaskDefinitionKey()).isEqualTo("taskValidationAdmin");
            assertThat(taskService.createTaskQuery()
                    .processInstanceId(process.getId())
                    .taskCandidateGroup("admin")
                    .count()).isEqualTo(1);
        } finally {
            if (runtimeService.createProcessInstanceQuery().processInstanceId(process.getId()).count() > 0) {
                runtimeService.deleteProcessInstance(process.getId(), "integration test cleanup");
            }
        }
    }
}
