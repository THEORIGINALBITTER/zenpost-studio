using Microsoft.EntityFrameworkCore;
using ZenPost.Server.Models;

namespace ZenPost.Server.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<User> Users => Set<User>();
    public DbSet<AuthProvider> AuthProviders => Set<AuthProvider>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentThumbnail> DocumentThumbnails => Set<DocumentThumbnail>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<AuthProvider>()
            .HasIndex(p => new { p.Provider, p.ProviderUserId })
            .IsUnique();

        modelBuilder.Entity<Project>()
            .HasIndex(p => new { p.UserId, p.Name });

        modelBuilder.Entity<Document>()
            .HasIndex(d => new { d.UserId, d.ProjectId, d.FileName });

        modelBuilder.Entity<DocumentThumbnail>()
            .HasIndex(t => t.DocumentId)
            .IsUnique();
    }
}
