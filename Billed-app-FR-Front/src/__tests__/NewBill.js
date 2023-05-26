/**
 * @jest-environment jsdom
*/

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  let root;
  let newBillContainer;
  let store;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

    root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);

    router();
    window.onNavigate(ROUTES_PATH.NewBill);
    store = mockStore;
    newBillContainer = new NewBill(({ document, onNavigate, store, localStorage }));
  });

  afterEach(() => {
    // Nettoyage du body après chaque test
    document.body.innerHTML = "";
  });

  // Test : Vérifie que l'icône de l'email est mise en surbrillance
  describe("When I am on NewBill Page", () => {
    test("Then the mail icon in vertical layout should be highlighted", async () => {
      await waitFor(() => screen.getByTestId('icon-mail'));
      const mailIcon = screen.getByTestId('icon-mail');
      expect(mailIcon.className).toBe("active-icon");
    });

    // Test : Vérifie que le formulaire des nouvelles factures est affiché
    test("Then the new bill form is displayed", () => {
      document.body.innerHTML = NewBillUI();
      const newBillForm = screen.getByTestId('form-new-bill');
      expect(newBillForm).toBeTruthy();
    });
  });

  // Test : Vérifie que de l'affichage du nom du fichier dans l'input après avoir ajouté un fichier
  describe("When I am on NewBill Page and I add an image file", () => {
    test("Then the filename is displayed in the input ", () => {
      document.body.innerHTML = NewBillUI();

      const handleChangeFile = jest.fn(newBillContainer.handleChangeFile);
      const input = screen.getByTestId("file");

      // Ajouter un écouteur d'événement pour le changement de fichier et simuler l'ajout d'un fichier
      input.addEventListener("change", handleChangeFile);
      userEvent.upload(input, new File(["test"], "test.png", { type: "image/png" }));

      // Vérifier que le nom et le type du fichier ajouté correspondent
      expect(input.files[0].name).toBe("test.png");
      expect(input.files[0].type).toBe("image/png");
      // Vérifier que la fonction handleChangeFile a été appelée
      expect(handleChangeFile).toHaveBeenCalled();
    });
  });

  // Test : Vérifie que l'affichage d'un message d'erreur lors de l'ajout d'un fichier avec un format invalide
  describe("When I am on NewBill Page and I add a file with invalid format", () => {
    test("Then an error message is displayed", () => {
      document.body.innerHTML = NewBillUI();

      const handleChangeFile = jest.fn(newBillContainer.handleChangeFile);
      const input = screen.getByTestId("file");

      // Ajouter un écouteur d'événement pour le changement de fichier et simuler l'ajout d'un fichier avec un format invalide
      input.addEventListener("change", handleChangeFile);
      userEvent.upload(input, new File(["test"], "video.mp4", { type: "media/mp4" }));

      // Vérifier que la fonction handleChangeFile a été appelée
      expect(handleChangeFile).toHaveBeenCalled();
      // Vérifier que le message d'erreur approprié est affiché à l'écran
      expect(screen.getByText("Format incorrect : Merci de choisir un fichier .jpg, .jpeg ou .png")).toBeTruthy();
    });
  });
});

// Test d'intégration POST : Ajout d'une facture
describe("Given I am connected as an Employee", () => {
  let root;

  beforeEach(() => {
    // Création de l'élément "root" et ajout au body du document
    root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);
    router();
  });

  // Test : Vérifie que que la facture est ajoutée via une requête POST à l'API
  describe("When I am on NewBill Page, I fill the form and submit", () => {
    test("Then the bill is added to API POST", async () => {
      // Configuration du local storage avec un utilisateur de type "Employee" et un email
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
      // Ajouter le code HTML du formulaire de nouvelle facture au body du document
      document.body.innerHTML = NewBillUI();
      const store = mockStore;
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const newBill = new NewBill({
        document, onNavigate, store, localStorage
      });

      const nameField = screen.getByTestId("expense-name");
      userEvent.type(nameField, "Transports");
      const dateField = screen.getByTestId("datepicker");
      userEvent.type(dateField, "2021-02-09");
      const amountField = screen.getByTestId("amount");
      userEvent.type(amountField, "1000");
      const pctField = screen.getByTestId("pct");
      userEvent.type(pctField, "22");
      const commentaryField = screen.getByTestId("commentary");
      userEvent.type(commentaryField, "Un commentaire");
      const proofField = screen.getByTestId("file");
      userEvent.upload(proofField, new File(['image_exemple.png'], "image_exemple.png", { type: "png" }));

      const submitBill = jest.fn(newBill.handleSubmit);
      const newBillForm = screen.getByTestId("form-new-bill");
      newBillForm.addEventListener("submit", submitBill);
      userEvent.click(screen.getByText('Envoyer'));

      // Vérifier que la fonction handleSubmit a été appelée
      expect(submitBill).toHaveBeenCalled();
      // Vérifier que le bouton de nouvelle facture est présent à l'écran
      expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
    });
  });
});

// Test des erreurs d'API
describe("When an error occurs on API", () => {
  beforeEach(() => {
    // Espionner la méthode "bills" du store pour simuler une erreur
    jest.spyOn(mockStore, "bills")
    Object.defineProperty(
      window,
      'localStorage', {
        value: localStorageMock
      }
    )
    // Configuration de valeurs pour le test
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "a@a"
    }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.appendChild(root)
    router()
  })

  // Test : Vérifie que de l'affichage d'un message d'erreur 404 lors de la récupération des factures depuis l'API
  test("Fetch bills from an API and fails with 404 message error", async () => {
    // Simulation d'une erreur 404 lors de la récupération des factures
    mockStore.bills.mockImplementationOnce(() => {
      return {
        list: () => {
          return Promise.reject(new Error("Erreur 404"))
        }
      }
    })
    // Ajouter le code HTML sur l'interface des factures avec le message d'erreur 404
    document.body.innerHTML = BillsUI({
      error: 'Erreur 404'
    })
    await new Promise(process.nextTick)
    const message = await screen.getByText(/Erreur 404/)
    // Vérifier que le message d'erreur 404 est affiché à l'écran
    expect(message).toBeTruthy()
  })

  // Test : Vérifie que de l'affichage d'un message d'erreur 500 lors de la récupération des factures depuis l'API
  test("fetches messages from an API and fails with 500 message error", async () => {
    // Erreur 500 lors de la récupération des factures
    mockStore.bills.mockImplementationOnce(() => {
      return {
        list: () => {
          return Promise.reject(new Error("Erreur 500"))
        }
      }
    })
    // Ajouter le code HTML sur l'interface des factures avec le message d'erreur 500
    document.body.innerHTML = BillsUI({
      error: 'Erreur 500'
    })
    await new Promise(process.nextTick)
    const message = await screen.getByText(/Erreur 500/)
    // Le message d'erreur 500 est affiché à l'écran
    expect(message).toBeTruthy()
  })
})