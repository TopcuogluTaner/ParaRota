using AutoMapper;
using ParaRota.Application.DTOs.Debts;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class DebtMappingProfile : Profile
{
    public DebtMappingProfile()
    {
        CreateMap<Debt, DebtDto>()
            .ForMember(d => d.PaidAmount, opt => opt.MapFrom(s => s.Amount - s.RemainingAmount))
            .ForMember(d => d.PaymentsCount, opt => opt.MapFrom(s => s.Payments.Count))
            .ForMember(d => d.LastPaymentDate,
                opt => opt.MapFrom(s => s.Payments.Any()
                    ? (DateTime?)s.Payments.Max(p => p.PaymentDate)
                    : null));

        CreateMap<Debt, DebtListItemDto>();

        CreateMap<DebtPayment, DebtPaymentDto>();
    }
}
