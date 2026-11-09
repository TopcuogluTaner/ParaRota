using AutoMapper;
using ParaRota.Application.DTOs.Transactions;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class TransactionMappingProfile : Profile
{
    public TransactionMappingProfile()
    {
        CreateMap<Transaction, TransactionDto>()
            .ForMember(d => d.CreatedByName, opt => opt.MapFrom(s =>
                s.User != null
                    ? ((s.User.FirstName ?? string.Empty) + " " + (s.User.LastName ?? string.Empty)).Trim()
                    : null));
    }
}
