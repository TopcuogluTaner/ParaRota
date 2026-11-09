using AutoMapper;
using ParaRota.Application.DTOs.Investments;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class InvestmentMappingProfile : Profile
{
    public InvestmentMappingProfile()
    {
        // Değerleme alanları (CurrentUnitPrice/CurrentValue/ProfitLoss*/PriceAsOf)
        // servis tarafında hesaplanıp set edilir; mapper yalnız temel alanları taşır.
        CreateMap<InvestmentHolding, HoldingDto>();
    }
}
