using MediatR;
using ParaRota.Application.DTOs.Rent;
using ParaRota.Domain.Dtos;

namespace ParaRota.Application.Features.RentFeatures.Queries.GetRentIncrease;

public sealed record GetRentIncreaseQuery(decimal CurrentRent, int RenewalMonth, int RenewalYear)
    : IRequest<ApiResponse<RentIncreaseResultDto>>;
