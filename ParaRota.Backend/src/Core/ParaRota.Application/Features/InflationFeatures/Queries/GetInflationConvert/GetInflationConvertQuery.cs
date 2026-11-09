using MediatR;
using ParaRota.Application.DTOs.Inflation;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InflationFeatures.Queries.GetInflationConvert;

/// <summary>
/// Paranın değeri: <paramref name="Amount"/> tutarının başlangıç ayından bitiş ayına TÜFE
/// eşdeğeri. Bitiş ayı/yılı null ise en güncel yayınlanan ay kullanılır.
/// </summary>
public sealed record GetInflationConvertQuery(
    decimal Amount, int FromMonth, int FromYear, int? ToMonth, int? ToYear)
    : IRequest<ApiResponse<InflationConvertResultDto>>;
