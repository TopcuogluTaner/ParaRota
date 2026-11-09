using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.UpdateCategory;

public sealed record UpdateCategoryCommand(int UserId, int Id, UpdateCategoryDto Dto)
    : IRequest<ApiResponse<CategoryDto>>;
