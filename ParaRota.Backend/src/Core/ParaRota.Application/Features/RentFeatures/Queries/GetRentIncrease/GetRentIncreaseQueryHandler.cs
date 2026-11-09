using MediatR;
using ParaRota.Application.DTOs.Rent;
using ParaRota.Application.Services;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RentFeatures.Queries.GetRentIncrease;

public sealed class GetRentIncreaseQueryHandler(IRentIncreaseService service)
    : IRequestHandler<GetRentIncreaseQuery, ApiResponse<RentIncreaseResultDto>>
{
    public Task<ApiResponse<RentIncreaseResultDto>> Handle(GetRentIncreaseQuery request, CancellationToken cancellationToken)
        => service.CalculateAsync(request.CurrentRent, request.RenewalMonth, request.RenewalYear, cancellationToken);
}
