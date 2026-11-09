using AutoMapper;
using ParaRota.Application.DTOs.Goals;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class GoalMappingProfile : Profile
{
    public GoalMappingProfile()
    {
        // Entity <-> DTO rename: TargetAmount <-> Target, CurrentAmount <-> Current
        CreateMap<Goal, GoalDto>()
            .ForMember(d => d.Target, opt => opt.MapFrom(s => s.TargetAmount))
            .ForMember(d => d.Current, opt => opt.MapFrom(s => s.CurrentAmount));
    }
}
