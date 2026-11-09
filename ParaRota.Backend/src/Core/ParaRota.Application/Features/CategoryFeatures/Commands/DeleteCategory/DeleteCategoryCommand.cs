using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.CategoryFeatures.Commands.DeleteCategory;

public sealed record DeleteCategoryCommand(int UserId, int Id) : IRequest<ApiResponse<string>>;
