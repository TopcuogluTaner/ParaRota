using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Queries.GetCategoryById;

public sealed record GetCategoryByIdQuery(int UserId, int Id) : IRequest<ApiResponse<CategoryDto>>;
