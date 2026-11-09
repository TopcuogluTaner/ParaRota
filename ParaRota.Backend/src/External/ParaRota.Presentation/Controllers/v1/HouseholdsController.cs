using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ParaRota.Application.DTOs.Households;
using ParaRota.Application.Features.HouseholdFeatures.Commands.AcceptInvite;
using ParaRota.Application.Features.HouseholdFeatures.Commands.CancelInvite;
using ParaRota.Application.Features.HouseholdFeatures.Commands.CreateHousehold;
using ParaRota.Application.Features.HouseholdFeatures.Commands.InviteToHousehold;
using ParaRota.Application.Features.HouseholdFeatures.Commands.LeaveHousehold;
using ParaRota.Application.Features.HouseholdFeatures.Commands.RemoveMember;
using ParaRota.Application.Features.HouseholdFeatures.Commands.ResendInvite;
using ParaRota.Application.Features.HouseholdFeatures.Commands.TransferOwnership;
using ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateHousehold;
using ParaRota.Application.Features.HouseholdFeatures.Commands.UpdateMemberRole;
using ParaRota.Application.Features.HouseholdFeatures.Queries.GetHouseholdById;
using ParaRota.Application.Features.HouseholdFeatures.Queries.GetMembers;
using ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyHouseholds;
using ParaRota.Application.Features.HouseholdFeatures.Queries.GetMyMemberships;
using ParaRota.Application.Features.HouseholdFeatures.Queries.GetPendingInvites;
using ParaRota.Application.Services;
using ParaRota.Presentation.Abstraction;
using ParaRota.Presentation.Filters;

namespace ParaRota.Presentation.Controllers.v1;

[Authorize]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/households")]
public class HouseholdsController(ISender sender, ICurrentUserService currentUser) : ApiController(sender)
{
    // Çift taraflı premium kuralı: aile özelliği hem davet eden hem davet edilen
    // için premium gerektirir. GetMine ve Leave bilinçli olarak [RequirePremium]
    // DEĞİL: GetMine premium'suz kullanıcıya boş liste döner (sahadaki eski
    // istemciler 403 yerine zarifçe düşsün), Leave ise premium'u biten üyenin
    // aileden kendi isteğiyle ayrılabilmesi için açık kalır.
    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetMyHouseholdsQuery(currentUser.UserId.Value), cancellationToken));
    }

    /// <summary>
    /// Üyelik listesi — bilinçli olarak premium'suz: premium'u biten üye hangi ailelere
    /// üye olduğunu görüp AYRILABİLMELİ (Leave da premium'suz). Aile verisi dönmez;
    /// yalnız ad/rol/üye sayısı.
    /// </summary>
    [HttpGet("my-memberships")]
    public async Task<IActionResult> GetMyMemberships(CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetMyMembershipsQuery(currentUser.UserId.Value), cancellationToken));
    }

    [HttpGet("{id:int}")]
    [RequirePremium]
    public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetHouseholdByIdQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost]
    [RequirePremium]
    public async Task<IActionResult> Create([FromBody] CreateHouseholdDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CreateHouseholdCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpPut("{id:int}")]
    [RequirePremium]
    public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateHouseholdDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateHouseholdCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpGet("{id:int}/members")]
    [RequirePremium]
    public async Task<IActionResult> GetMembers([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetMembersQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpGet("{id:int}/invites")]
    [RequirePremium]
    public async Task<IActionResult> GetPendingInvites([FromRoute] int id, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new GetPendingInvitesQuery(currentUser.UserId.Value, id), cancellationToken));
    }

    [HttpPost("{id:int}/invites")]
    [RequirePremium]
    [EnableRateLimiting("auth-standard")]
    public async Task<IActionResult> Invite([FromRoute] int id, [FromBody] InviteToHouseholdDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new InviteToHouseholdCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpDelete("{id:int}/invites/{inviteId:int}")]
    [RequirePremium]
    public async Task<IActionResult> CancelInvite([FromRoute] int id, [FromRoute] int inviteId, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new CancelInviteCommand(currentUser.UserId.Value, id, inviteId), cancellationToken));
    }

    [HttpPost("{id:int}/invites/{inviteId:int}/resend")]
    [RequirePremium]
    [EnableRateLimiting("auth-standard")]
    public async Task<IActionResult> ResendInvite([FromRoute] int id, [FromRoute] int inviteId, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new ResendInviteCommand(currentUser.UserId.Value, id, inviteId), cancellationToken));
    }

    [HttpPost("accept-invite")]
    [RequirePremium]
    [EnableRateLimiting("auth-standard")]
    public async Task<IActionResult> AcceptInvite([FromBody] AcceptInviteDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new AcceptInviteCommand(currentUser.UserId.Value, dto), cancellationToken));
    }

    [HttpDelete("{id:int}/members/{memberUserId:int}")]
    [RequirePremium]
    public async Task<IActionResult> RemoveMember([FromRoute] int id, [FromRoute] int memberUserId, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new RemoveMemberCommand(currentUser.UserId.Value, id, memberUserId), cancellationToken));
    }

    [HttpPatch("{id:int}/members/{memberUserId:int}/role")]
    [RequirePremium]
    [EnableRateLimiting("auth-standard")]
    public async Task<IActionResult> UpdateMemberRole([FromRoute] int id, [FromRoute] int memberUserId, [FromBody] UpdateMemberRoleDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new UpdateMemberRoleCommand(currentUser.UserId.Value, id, memberUserId, dto), cancellationToken));
    }

    [HttpPost("{id:int}/leave")]
    public async Task<IActionResult> Leave([FromRoute] int id, [FromBody] LeaveHouseholdDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new LeaveHouseholdCommand(currentUser.UserId.Value, id, dto), cancellationToken));
    }

    [HttpPost("{id:int}/transfer-ownership")]
    [RequirePremium]
    public async Task<IActionResult> TransferOwnership([FromRoute] int id, [FromBody] TransferOwnershipDto dto, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is null) return Unauthorized();
        return ToActionResult(await Sender.Send(new TransferOwnershipCommand(currentUser.UserId.Value, id, dto.NewOwnerUserId), cancellationToken));
    }
}
