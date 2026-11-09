using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.AuthFeatures.Commands.SetMonthlyPdfEmail;

/// <summary>Aylık özet PDF e-postası tercihini (opt-in) günceller.</summary>
public sealed record SetMonthlyPdfEmailCommand(int UserId, bool Enabled) : IRequest<ApiResponse<bool>>;
