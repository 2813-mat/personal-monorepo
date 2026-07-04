<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${.lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginTitle",(realm.displayName!''))}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <#if properties.styles?has_content>
    <#list properties.styles?split(' ') as style>
      <link href="${url.resourcesPath}/${style}" rel="stylesheet">
    </#list>
  </#if>
</head>

<body class="cf-body ${bodyClass}">
  <div class="cf-page">
    <div class="cf-card">

      <#-- Left: brand panel -->
      <aside class="cf-brand" aria-hidden="true">
        <div class="cf-brand__top">
          <img class="cf-brand__logo" src="${url.resourcesPath}/img/logo-white.svg" alt="Planejador Financeiro">
        </div>
        <div class="cf-brand__body">
          <h2 class="cf-brand__headline">Cansado de planilhas?</h2>
          <p class="cf-brand__sub">Planeje suas finanças sem a bagunça das planilhas.</p>
        </div>
        <div class="cf-brand__foot">© ${.now?string("yyyy")} Planejador Financeiro</div>
      </aside>

      <#-- Right: form panel -->
      <main class="cf-form" role="main">
        <header class="cf-form__header">
          <#if displayRequiredFields>
            <div class="cf-required-note"><span class="cf-req">*</span> ${msg("requiredFields")}</div>
          </#if>
          <#nested "header">
        </header>

        <#-- Alerts -->
        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
          <div class="cf-alert cf-alert--${message.type}">
            <span class="cf-alert__text">${kcSanitize(message.summary)?no_esc}</span>
          </div>
        </#if>

        <#nested "form">

        <#if auth?has_content && auth.showTryAnotherWayLink()>
          <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" class="cf-try-again">
            <input type="hidden" name="tryAnotherWay" value="on">
            <a href="#" id="try-another-way" class="cf-link"
               onclick="document.forms['kc-select-try-another-way-form'].submit();return false;">${msg("doTryAnotherWay")}</a>
          </form>
        </#if>

        <#nested "socialProviders">

        <#if displayInfo>
          <div class="cf-info">
            <#nested "info">
          </div>
        </#if>
      </main>

    </div>
  </div>
</body>
</html>
</#macro>
