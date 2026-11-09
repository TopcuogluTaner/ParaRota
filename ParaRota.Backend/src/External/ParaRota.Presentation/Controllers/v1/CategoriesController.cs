using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Application.Features.CategoryFeatures.Commands.CreateCategory;
using ParaRota.Application.Features.CategoryFeatures.Commands.DeleteCategory;
using ParaRota.Application.Features.CategoryFeatures.Commands.MergeCategory;
using ParaRota.Application.Features.CategoryFeatures.Commands.UpdateCategory;
using ParaRota.Application.Features.CategoryFeatures.Queries.GetCategories;
using ParaRota.Application.Features.CategoryFeatures.Queries.GetCategoryById;
using ParaRota.Application.Services;
using ParaRota.Domain.Enums;
using ParaRota.Presentation.Abstraction;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[EnableRateLimiting("api-general")]
[Route("api/v{version:apiVersion}/categories")]
public class CategoriesController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TransactionType? type, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetCategoriesQuery(currentUser.UserId.Value, type), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetCategoryByIdQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateCategoryCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateCategoryDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateCategoryCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new DeleteCategoryCommand(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost("{id:int}/merge")]
    public async Task<IActionResult> Merge([FromRoute] int id, [FromBody] MergeCategoryDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new MergeCategoryCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }
}
