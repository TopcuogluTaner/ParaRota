using MediatR;
using Microsoft.AspNetCore.Mvc;
using ParaRota.Domain.Dtos;

namespace ParaRota.Presentation.Abstraction;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
public abstract class ApiController(ISender sender) : ControllerBase
{
    protected readonly ISender Sender = sender;

    protected IActionResult ToActionResult<T>(ApiResponse<T> response)
        => StatusCode(response.StatusCode == 0 ? (response.IsSuccess ? 200 : 400) : response.StatusCode, response);
}
