using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.TransferOwnership;

public sealed record TransferOwnershipCommand(int UserId, int HouseholdId, int NewOwnerUserId) : IRequest<ApiResponse<string>>;
