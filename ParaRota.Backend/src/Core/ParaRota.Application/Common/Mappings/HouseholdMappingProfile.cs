using AutoMapper;
using ParaRota.Application.DTOs.Households;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class HouseholdMappingProfile : Profile
{
    public HouseholdMappingProfile()
    {
        // Household -> HouseholdDto: OwnerName, MemberCount, MyRole servis tarafında doldurulacak.
        CreateMap<Household, HouseholdDto>()
            .ForMember(d => d.OwnerName, opt => opt.Ignore())
            .ForMember(d => d.MemberCount, opt => opt.Ignore())
            .ForMember(d => d.MyRole, opt => opt.Ignore());

        CreateMap<HouseholdMember, HouseholdMemberDto>()
            .ForMember(d => d.FirstName, opt => opt.MapFrom(s => s.User != null ? s.User.FirstName : string.Empty))
            .ForMember(d => d.LastName, opt => opt.MapFrom(s => s.User != null ? s.User.LastName : string.Empty))
            .ForMember(d => d.Email, opt => opt.MapFrom(s => s.User != null ? s.User.Email ?? string.Empty : string.Empty));

        // InvitedByName servis tarafında set edilir.
        CreateMap<HouseholdInvite, HouseholdInviteDto>()
            .ForMember(d => d.InvitedByName, opt => opt.Ignore());
    }
}
