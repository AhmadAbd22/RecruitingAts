using Microsoft.EntityFrameworkCore;
using RecruitingAts.Api.Data;
using RecruitingAts.Api.Data.Entities;
using RecruitingAts.Api.Services;

namespace RecruitingAts.Tests;

public class ApplicationPipelineStageCatalogTests
{
    [Fact]
    public async Task GetPipelineStagesAsync_ReturnsActiveStagesOrderedBySortOrder()
    {
        await using var db = TestFixture.CreateDb();
        var inactiveStageId = Guid.NewGuid();
        var firstStageId = Guid.NewGuid();
        var secondStageId = Guid.NewGuid();

        db.PipelineStages.AddRange(
            new PipelineStage
            {
                PipelineStageId = inactiveStageId,
                Name = "Inactive",
                SortOrder = 1,
                IsActive = false
            },
            new PipelineStage
            {
                PipelineStageId = secondStageId,
                Name = "Interview",
                SortOrder = 20
            },
            new PipelineStage
            {
                PipelineStageId = firstStageId,
                Name = "Applied",
                SortOrder = 10
            });
        await db.SaveChangesAsync();

        var service = new ApplicationService(db, new RequisitionScopeService(db));

        var stages = await service.GetPipelineStagesAsync();

        var stage = Assert.Single(stages, s => s.PipelineStageId == firstStageId);
        Assert.Equal(
            new[] { firstStageId, secondStageId },
            stages.Select(s => s.PipelineStageId).ToArray());
        Assert.Equal("Applied", stage.Name);
        Assert.Equal(10, stage.SortOrder);
        Assert.DoesNotContain(stages, s => s.PipelineStageId == inactiveStageId);
    }
}