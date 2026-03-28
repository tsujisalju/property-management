using Amazon.S3;
using Amazon.S3.Model;

namespace PropertyApi.Services;

public interface IS3Service
{
    /// <summary>Generates a pre-signed URL for direct browser upload (PUT).</summary>
    Task<string> GetUploadUrlAsync(string key, string contentType, int expiryMinutes = 5);

    /// <summary>Generates a pre-signed URL for reading a private object.</summary>
    Task<string> GetDownloadUrlAsync(string key, int expiryMinutes = 60);

    /// <summary>Deletes an object from S3.</summary>
    Task DeleteAsync(string key);
}

public class S3Service(IAmazonS3 s3, IConfiguration config) : IS3Service
{
    private readonly string _bucket = config["AWS_S3_BUCKET"]
        ?? throw new InvalidOperationException("AWS_S3_BUCKET is not configured.");

    public Task<string> GetUploadUrlAsync(string key, string contentType, int expiryMinutes = 5)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = key,
            Verb = HttpVerb.PUT,
            ContentType = contentType,
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
        };
        return Task.FromResult(s3.GetPreSignedURL(request));
    }

    public Task<string> GetDownloadUrlAsync(string key, int expiryMinutes = 60)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
        };
        return Task.FromResult(s3.GetPreSignedURL(request));
    }

    public async Task DeleteAsync(string key)
    {
        await s3.DeleteObjectAsync(_bucket, key);
    }
}
