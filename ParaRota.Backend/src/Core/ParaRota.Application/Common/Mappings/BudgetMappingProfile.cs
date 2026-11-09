using AutoMapper;
using ParaRota.Application.DTOs.Budgets;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class BudgetMappingProfile : Profile
{
    public BudgetMappingProfile()
    {
        // Spent/Remaining/UsagePercentage/AlertLevel runtime'da service'te doldurulur.
        CreateMap<Budget, BudgetDto>()
            .ForMember(d => d.Spent, o => o.Ignore())
            .ForMember(d => d.Remaining, o => o.Ignore())
            .ForMember(d => d.UsagePercentage, o => o.Ignore())
            .ForMember(d => d.AlertLevel, o => o.Ignore());
    }
}
