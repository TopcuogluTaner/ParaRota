using MediatR;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.MergeCategory;

public sealed record MergeCategoryCommand(int UserId, int SourceId, MergeCategoryDto Dto)
    : IRequest<ApiResponse<string>>;
