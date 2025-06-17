const pageLoader = document.getElementById("pageLoader");

export function showLoader() {
  if (pageLoader) {
    pageLoader.classList.remove("hidden");
    pageLoader.style.display = "flex";
  }
}

export function hideLoader() {
  if (pageLoader) {
    pageLoader.classList.add("hidden");
    pageLoader.addEventListener("transitionend", function handler() {
      pageLoader.style.display = "none";
      pageLoader.removeEventListener("transitionend", handler);
    });
  }
}
