using TextToSpeech.Models;

namespace TextToSpeech.Services
{
    public interface ICurrentUserService
    {
        bool IsAuthenticated(HttpContext context);

        int? GetCurrentUserId(HttpContext context);


        User? GetCurrentUser(HttpContext context);

        void SignIn(HttpContext context, int userId);

        void SignOut(HttpContext context);

    }
}
