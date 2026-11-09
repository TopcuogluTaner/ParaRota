using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetAvatar;

/// <summary>Profil rozetini günceller; null/boş Avatar rozeti kaldırır.</summary>
public sealed record SetAvatarCommand(int UserId, string? Avatar) : IRequest<ApiResponse<string?>>;
