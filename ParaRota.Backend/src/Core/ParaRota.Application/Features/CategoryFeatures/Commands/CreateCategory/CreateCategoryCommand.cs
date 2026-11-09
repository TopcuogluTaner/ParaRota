using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.CreateCategory;

public sealed record CreateCategoryCommand(int UserId, CreateCategoryDto Dto)
    : IRequest<ApiResponse<CategoryDto>>;
