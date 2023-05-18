/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js"
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore)

describe("Given I am connected as an employee", () => {
    let root;
    let bill;
    let store;
    beforeEach(() => {
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
        window.localStorage.setItem('user', JSON.stringify({
            type: 'Employee'
        }));
        root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH.Bills);
        store = mockStore;
        bill = new Bills(({
            document,
            onNavigate,
            store,
            localStorage
        }));
    });

    afterEach(() => {
        // Nettoyage du body du document après chaque test
        document.body.innerHTML = "";
    });

    // Test : Vérification que l'icône des factures est mise en surbrillance en mode vertical
    describe("When I am on Bills Page", () => {
        test("Then bill icon in vertical layout should be highlighted", async () => {
            // Attendre que l'icône des factures soit rendue à l'écran
            await waitFor(() => screen.getByTestId("icon-window"));
            const windowIcon = screen.getByTestId("icon-window");
            // Vérifier que la classe de l'icône contient "active-icon"
            expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
        });

        // Test : Vérification que les factures sont triées de la plus ancienne à la plus récente
        test("Then bills should be ordered from earliest to latest", () => {
            // Ajouter le code HTML de l'interface des factures avec les données de factures au body du document
            document.body.innerHTML = BillsUI({
                data: bills
            });
            const dates = screen
                .getAllByText(
                    /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
                )
                .map((a) => a.innerText);
            const antiChrono = (a, b) => (a < b ? 1 : -1);
            const datesSorted = [...dates].sort(antiChrono);
            // Vérifier que les dates affichées correspondent à un ordre décroissant
            expect(dates).toEqual(datesSorted);
        });
    });

    // Test : Vérification de la redirection vers la page de création pour une nouvelle facture
    describe("When I click on new bill", () => {
        test("Then I should be redirect to new bill", async () => {
            store = null
            // Attendre que le bouton de création d'une nouvelle facture soit rendu à l'écran
            await waitFor(() => screen.getByTestId("btn-new-bill"));
            const newBillBtn = screen.getByTestId("btn-new-bill");
            // Vérifier que le bouton a la classe "btn-primary"
            expect(newBillBtn.classList.contains("btn-primary")).toBeTruthy();

            const handleClickNewBill = jest.fn(bill.handleClickNewBill);
            newBillBtn.addEventListener("click", handleClickNewBill);
            userEvent.click(newBillBtn);

            // Vérifier que la fonction handleClickNewBill a été appelée
            expect(handleClickNewBill).toHaveBeenCalled();
            // Vérifier que le texte "Envoyer une note de frais" est présent à l'écran
            expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
        });
    });

    // Test : Vérification de l'ouverture d'une modal lors du clic sur l'icône de l'œil
    describe("When I click on eye icon", () => {
        test("Then a modal should open", async () => {
            // Ajouter le code HTML de l'interface des factures avec les données de factures au body du document
            document.body.innerHTML = BillsUI({ data: bills });
            const handleClickIconEye = jest.fn((icon) => bill.handleClickIconEye(icon));
            const iconEye = screen.getAllByTestId("icon-eye");
            const modale = screen.getByTestId("modale");
            // Simuler la méthode $.fn.modal pour ajouter la classe "show" à la modal
            $.fn.modal = jest.fn(() => modale.classList.add("show"));
            iconEye.forEach((icon) => {
                icon.addEventListener("click", handleClickIconEye(icon));
                userEvent.click(icon);
                // Vérifier que la fonction handleClickIconEye a été appelée
                expect(handleClickIconEye).toHaveBeenCalled();
            });
            // Vérifier que la classe de la modal contient "show"
            expect(modale.getAttribute("class")).toContain("show");
        })
    })

    // Test : Vérification de la récupération des factures depuis l'API GET
    describe("When I navigate to Bills Page", () => {
        test("fetches bills from mock API GET", async () => {
            // Ajouter le code HTML de l'interface des factures avec les données de factures au body du document
            document.body.innerHTML = BillsUI({ data: bills });
            await waitFor(() => screen.getByText("Mes notes de frais"));
            const newBillBtn = screen.getByTestId("btn-new-bill");
            expect(newBillBtn).toBeTruthy();
            const data = await bill.getBills();
            // Vérifier que le nombre de factures récupérées est égal à 4
            expect(data.length).toBe(4);
        });
    });

    // Test des erreurs d'API
    describe("When an error occurs on API", () => {
        beforeEach(() => {
            // Espionner la méthode "bills" du store pour simuler une erreur
            jest.spyOn(mockStore, "bills");
            Object.defineProperty(window, "localStorage", {
                value: localStorageMock,
            });

            root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.appendChild(root);
            router();
        });
        // Test : Vérification de l'affichage d'un message d'erreur 404 lors de la récupération des factures depuis l'API
        test("Fetches bills from an API and fails with 404 message error", async () => {
            // Simulation d'une erreur 404 lors de la récupération des factures
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    list: () => {
                        return Promise.reject(new Error("Erreur 404"));
                    },
                };
            });
            window.onNavigate(ROUTES_PATH.Bills);
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 404/);
            // Vérifier que le message d'erreur 404 est affiché à l'écran
            expect(message).toBeTruthy();
        });
        // Test : Vérification de l'affichage d'un message d'erreur 500 lors de la récupération des factures depuis l'API
        test("Fetches messages from an API and fails with 500 message error", async () => {
            // Simulation d'une erreur 500 lors de la récupération des factures
            mockStore.bills.mockImplementationOnce(() => {
                return { list: () => { return Promise.reject(new Error("Erreur 500")); }, };
            });
            window.onNavigate(ROUTES_PATH.Bills);
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 500/);
            expect(message).toBeTruthy();
        });
    });
})
