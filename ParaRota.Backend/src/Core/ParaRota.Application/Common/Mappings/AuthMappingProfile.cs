using AutoMapper;
using ParaRota.Application.DTOs.Auth;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class AuthMappingProfile : Profile
{
    public AuthMappingProfile()
    {
        CreateMap<AppUser, UserDto>()
            .ForMember(d => d.Email, o => o.MapFrom(s => s.Email ?? string.Empty))
            .ForMember(d => d.UserName, o => o.MapFrom(s => s.UserName ?? string.Empty))
            .ForMember(d => d.IsEmailVerified, o => o.MapFrom(s => s.EmailConfirmed))
            .ForMember(d => d.Roles, o => o.Ignore());
    }
}
