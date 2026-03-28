using Amazon.SimpleEmailV2;
using Amazon.SimpleEmailV2.Model;

namespace PropertyApi.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}

public class EmailService(IAmazonSimpleEmailServiceV2 ses, IConfiguration config) : IEmailService
{
    private readonly string _sender = config["AWS_SES_SENDER"]
        ?? throw new InvalidOperationException("AWS_SES_SENDER is not configured.");

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var request = new SendEmailRequest
        {
            FromEmailAddress = _sender,
            Destination = new Destination { ToAddresses = [toEmail] },
            Content = new EmailContent
            {
                Simple = new Message
                {
                    Subject = new Content { Data = subject },
                    Body = new Body
                    {
                        Html = new Content { Data = htmlBody, Charset = "UTF-8" }
                    }
                }
            }
        };
        await ses.SendEmailAsync(request);
    }
}
