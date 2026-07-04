<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=(realm.password && realm.registrationAllowed && !registrationDisabled??); section>
    <#if section = "header">
        <h1 class="cf-title">Bem-vindo de volta</h1>
        <p class="cf-subtitle">Entre na sua conta para continuar.</p>
    <#elseif section = "form">
        <#if realm.password>
            <form id="kc-form-login" class="cf-fields" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                <#if !usernameHidden??>
                    <div class="cf-field">
                        <label for="username" class="cf-label">
                            <#if !realm.loginWithEmailAllowed>Usuário
                            <#elseif !realm.registrationEmailAsUsername>Usuário ou e-mail
                            <#else>E-mail</#if>
                        </label>
                        <input tabindex="1" id="username" class="cf-input" name="username"
                               value="${(login.username!'')}" type="text" autofocus autocomplete="username"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
                        <#if messagesPerField.existsError('username','password')>
                            <span id="input-error" class="cf-field__error" aria-live="polite">
                                ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                            </span>
                        </#if>
                    </div>
                </#if>

                <div class="cf-field">
                    <label for="password" class="cf-label">Senha</label>
                    <div class="cf-input-wrap">
                        <input tabindex="2" id="password" class="cf-input" name="password" type="password"
                               autocomplete="current-password"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>">
                        <button class="cf-eye" type="button" aria-label="Mostrar senha"
                                aria-controls="password" data-password-toggle tabindex="-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                    <#if usernameHidden?? && messagesPerField.existsError('username','password')>
                        <span id="input-error" class="cf-field__error" aria-live="polite">
                            ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                        </span>
                    </#if>
                </div>

                <div class="cf-form-row">
                    <#if realm.rememberMe && !usernameHidden??>
                        <label class="cf-check">
                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"
                                   <#if login.rememberMe??>checked</#if>>
                            <span>Lembrar de mim</span>
                        </label>
                    <#else>
                        <span></span>
                    </#if>
                    <#if realm.resetPasswordAllowed>
                        <a tabindex="5" class="cf-link" href="${url.loginResetCredentialsUrl}">Esqueceu a senha?</a>
                    </#if>
                </div>

                <input type="hidden" id="id-hidden-input" name="credentialId"
                       <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>
                <button tabindex="4" class="cf-btn cf-btn--primary" name="login" id="kc-login" type="submit">Entrar</button>
            </form>
        </#if>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <div class="cf-divider"><span>ou</span></div>
            <ul class="cf-social">
                <#list social.providers as p>
                    <li>
                        <a id="social-${p.alias}" class="cf-btn cf-btn--social" type="button" href="${p.loginUrl}">
                            <#if p.iconClasses?has_content><i class="${p.iconClasses}" aria-hidden="true"></i></#if>
                            <span>${p.displayName!}</span>
                        </a>
                    </li>
                </#list>
            </ul>
        </#if>
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <span class="cf-info__text">Novo por aqui?
                <a tabindex="6" class="cf-link cf-link--strong" href="${url.registrationUrl}">Criar conta</a>
            </span>
        </#if>
    </#if>
</@layout.registrationLayout>

<script>
  (function () {
    var t = document.querySelector('[data-password-toggle]');
    if (!t) return;
    var input = document.getElementById(t.getAttribute('aria-controls'));
    t.addEventListener('click', function () {
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      t.classList.toggle('cf-eye--on', !showing);
    });
  })();
</script>
