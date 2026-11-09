using MediatR;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Queries.GetCurrentUser;

public sealed record GetCurrentUserQuery(int UserId) : IRequest<ApiResponse<UserDto>>;
