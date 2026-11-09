using AutoMapper;
using ParaRota.Application.DTOs.RecurringRules;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class RecurringRuleMappingProfile : Profile
{
    public RecurringRuleMappingProfile()
    {
        CreateMap<RecurringRule, RecurringRuleDto>();
    }
}
