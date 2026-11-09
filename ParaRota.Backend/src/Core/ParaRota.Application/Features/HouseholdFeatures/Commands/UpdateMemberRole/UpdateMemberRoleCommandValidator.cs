using FluentValidation;

namespace ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateMemberRole;

public sealed class UpdateMemberRoleCommandValidator : AbstractValidator<UpdateMemberRoleCommand>
{
    public UpdateMemberRoleCommandValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.HouseholdId).GreaterThan(0);
        RuleFor(x => x.MemberUserId).GreaterThan(0);
        RuleFor(x => x.Dto.Role).IsInEnum();
    }
}
