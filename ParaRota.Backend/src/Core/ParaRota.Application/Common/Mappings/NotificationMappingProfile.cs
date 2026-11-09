using AutoMapper;
using ParaRota.Application.DTOs.Notifications;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class NotificationMappingProfile : Profile
{
    public NotificationMappingProfile()
    {
        CreateMap<Notification, NotificationDto>();
    }
}
