"use strict";
// These sidebar entries remain visible but are not interactive.
for (const selector of [
  '[data-page="dashboard"]', '[data-page="corpus-search"]',
  '[data-page="textbooks"]',
  '[data-page="textbook-texts"]',
  '[data-page="listening-practices"]',
  '[data-book-type="词汇书籍"]'
]) {
  const button = document.querySelector('#sidebar .nav ' + selector);
  if (!button) continue;
  button.disabled = true;
  button.onclick = null;
  button.classList.add('nav-display-only');
}

// Group buttons only expand or collapse their submenu, without navigating.
for (const button of document.querySelectorAll('#sidebar .nav button[aria-controls]')) {
  const group = document.getElementById(button.getAttribute('aria-controls'));
  if (!group) continue;
  const expanded = ['question-bank-types','listening-nav-pages','book-types'].includes(group.id);
  group.hidden = !expanded;
  button.setAttribute('aria-expanded', String(expanded));
  button.onclick = () => {
    group.hidden = !group.hidden;
    button.setAttribute('aria-expanded', String(!group.hidden));
  };
}

// Keep each navigation group together when arranging the top-level entries.
const sidebarNav = document.querySelector('#sidebar .nav');
for (const selector of [
  '#vocabulary-nav-toggle', '#question-bank-toggle',
  '#textbook-nav-toggle', '[aria-controls="book-types"]', '#interactive-nav-toggle',
  '[data-page="corpus-search"]', '[data-page="dashboard"]', '#permissions-toggle'
]) {
  const button = sidebarNav.querySelector(selector);
  if (!button) continue;
  sidebarNav.append(button);
  const groupId = button.getAttribute('aria-controls');
  if (groupId) {
    const group = document.getElementById(groupId);
    if (group) sidebarNav.append(group);
  }
}

// The logo is decorative; all optional features are always available.
const sidebarBrandMark=document.querySelector('#sidebar .brandmark');
const sidebarBrandLogo=document.createElement('span');
sidebarBrandLogo.className='sidebar-brand-logo';
sidebarBrandLogo.innerHTML='<img src="assets/images/victor-company-logo.png" alt="维克多英语 Logo">';
sidebarBrandMark.replaceWith(sidebarBrandLogo);
function optionalFeaturesExpanded(){return true}

// Initialize the landing page after vocabulary helpers have loaded.
page='vocabulary';
const vocabularyGroup=document.getElementById('vocabulary-nav-pages');
if(vocabularyGroup)vocabularyGroup.hidden=false;
document.getElementById('vocabulary-nav-toggle')?.setAttribute('aria-expanded','true');
render();
