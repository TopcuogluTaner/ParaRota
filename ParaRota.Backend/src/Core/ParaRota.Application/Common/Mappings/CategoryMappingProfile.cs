using AutoMapper;
using ParaRota.Application.DTOs.Categories;
using ParaRota.Domain.Entities;

namespace ParaRota.Application.Common.Mappings;

public class CategoryMappingProfile : Profile
{
    public CategoryMappingProfile()
    {
        CreateMap<Category, CategoryDto>();
    }
}
