using MediatR;
using ParaRota.Application.DTOs.Inflation;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.InflationFeatures.Queries.GetInflationConvert;

public sealed class GetInflationConvertQueryHandler(IInflationCalculatorService service)
    : IRequestHandler<GetInflationConvertQuery, ApiResponse<InflationConvertResultDto>>
{
    public Task<ApiResponse<InflationConvertResultDto>> Handle(GetInflationConvertQuery request, CancellationToken cancellationToken)
        => service.ConvertAsync(request.Amount, request.FromMonth, request.FromYear, request.ToMonth, request.ToYear, cancellationToken);
}
