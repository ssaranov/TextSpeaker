using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore.Infrastructure;
using TextToSpeech.Data;
using TextToSpeech.Models;
using TextToSpeech.Services;

namespace TextToSpeech.Pages
{
    public class IndexModel : PageModel
    {
        private readonly AppDbContext _context;

        private readonly PasswordHasher<User> _passwordHasher;
        private readonly ICurrentUserService _currentUserService;


        public IndexModel(
            AppDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _passwordHasher = new PasswordHasher<User>();
        }

        [BindProperty]
        public string RegisterName { get; set; } = string.Empty;
        [BindProperty]
        public string RegisterLogin { get; set; } = string.Empty;
        [BindProperty]
        public string RegisterPassword { get; set; } = string.Empty;
        [BindProperty]
        public string RegisterConfirmPassword { get; set; } = string.Empty;
        [BindProperty]
        public string LoginLogin { get; set; } = string.Empty;
        [BindProperty]
        public string LoginPassword{ get; set; } = string.Empty;
        public bool IsAuthorized {  get; set; }
        public string CurrentUserName { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public void OnGet()
        {
            LoadCurrentUser();
        }

        public IActionResult OnPostRegister()
        {
            LoadCurrentUser();
            if (string.IsNullOrWhiteSpace(RegisterName) ||
                string.IsNullOrWhiteSpace(RegisterLogin) ||
                string.IsNullOrWhiteSpace(RegisterPassword) ||
                string.IsNullOrWhiteSpace(RegisterConfirmPassword))

            {
                Message = "Заполните все поля регистрации";
                return Page();
            }

            if (RegisterConfirmPassword != RegisterPassword)
            {
                Message = "Пароль не совпадает";
                return Page();
            }
            bool loginExist = _context.Users.Any(u => u.Login == RegisterPassword);
            if (loginExist)
            {
                Message = "Такой логин уже есть";
                return Page();
            }
            var user = new User
            {
                Name = RegisterName,
                Login = RegisterLogin
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, RegisterPassword);
            _context.Users.Add(user);
            _context.SaveChanges();
            _currentUserService.SignIn(HttpContext, user.Id);

            return RedirectToPage("/Reader");
        }
        public IActionResult OnPostLogin()
        {
            LoadCurrentUser();
            if (string.IsNullOrWhiteSpace(LoginLogin) ||
                string.IsNullOrWhiteSpace(LoginPassword))

            {
                Message = "Введите пароль и логин";
                return Page();
            }

            var user = _context.Users.FirstOrDefault(u => u.Login == LoginLogin);


            if (user == null)
            {
                Message = "Неверный логин или пароль";
                return Page();
            }
            var result = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                LoginPassword
                );
           

            if(result == PasswordVerificationResult.Failed)
            {
                Message = "Неверный пароль или логин";
                return Page();
            }

            _currentUserService.SignIn(HttpContext, user.Id); 

            return RedirectToPage("/Reader");
        }
        public IActionResult OnPostLogOut()
        {
            _currentUserService.SignOut(HttpContext);
            return RedirectToPage();
        }








        private void LoadCurrentUser()
        {
            var user = _currentUserService.GetCurrentUser(HttpContext);
            if(user == null)
            {
                IsAuthorized = false;
                return;
            }
            IsAuthorized = true;
            CurrentUserName = user.Name;
        }
    }
}
