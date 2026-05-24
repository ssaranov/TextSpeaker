using Microsoft.AspNetCore.Mvc;
using TextToSpeech.Services;

namespace TextToSpeech.Controllers
{
    public class AdminLogsContollers : Controller
    {
        private readonly ISpeechLogService _speechLogService;
        private readonly ICurrentUserService _currentUserService;


        public AdminLogsContollers(
            ISpeechLogService speechLogService, ICurrentUserService currentUserService)
        {
            _speechLogService = speechLogService;
            _currentUserService = currentUserService;
        }

        public ActionResult Index()
        {
            if(!_currentUserService.IsAuthenticated(HttpContext))
            {
                return RedirectToPage("/Index");
            }
            var log = _speechLogService.GetAllLogs();
            return View(log);
        }

            
            
    }
}
