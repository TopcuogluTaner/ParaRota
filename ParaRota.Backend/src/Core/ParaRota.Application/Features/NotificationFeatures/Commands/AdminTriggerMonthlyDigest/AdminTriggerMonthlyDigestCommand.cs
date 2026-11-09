using MediatR;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.NotificationFeatures.Commands.AdminTriggerMonthlyDigest;

/// <summary>Ay sonu karnesi job'ını elle tetikler (Hangfire'ı beklemeden); gönderilen bildirim sayısını döner.</summary>
public sealed record AdminTriggerMonthlyDigestCommand : IRequest<ApiResponse<int>>;
