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
        document.body.innerHTML = "";
    });

    describe("When I am on Bills Page", () => {
        test("Then bill icon in vertical layout should be highlighted", async () => {
            await waitFor(() => screen.getByTestId("icon-window"));
            const windowIcon = screen.getByTestId("icon-window");
            expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
        });
        test("Then bills should be ordered from earliest to latest", () => {
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
            expect(dates).toEqual(datesSorted);
        });
    });

    describe("When I click on new bill", () => {
        test("Then I should be redirect to new bill", async () => {
            store = null
            await waitFor(() => screen.getByTestId("btn-new-bill"));
            const newBillBtn = screen.getByTestId("btn-new-bill");
            expect(newBillBtn.classList.contains("btn-primary")).toBeTruthy();

            const handleClickNewBill = jest.fn(bill.handleClickNewBill);
            newBillBtn.addEventListener("click", handleClickNewBill);
            userEvent.click(newBillBtn);

            expect(handleClickNewBill).toHaveBeenCalled();
            expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
        });
    });

    describe("When I click on eye icon", () => {
        test("Then a modal should open", async () => {
            document.body.innerHTML = BillsUI({ data: bills });
            const handleClickIconEye = jest.fn((icon) => bill.handleClickIconEye(icon));
            const iconEye = screen.getAllByTestId("icon-eye");
            const modale = screen.getByTestId("modale");
            $.fn.modal = jest.fn(() => modale.classList.add("show"));
            iconEye.forEach((icon) => {
                icon.addEventListener("click", handleClickIconEye(icon));
                userEvent.click(icon);
                expect(handleClickIconEye).toHaveBeenCalled();
            });
            expect(modale.getAttribute("class")).toContain("show");
        })
    })
    describe("When I navigate to Bills Page", () => {
        test("fetches bills from mock API GET", async () => {
            document.body.innerHTML = BillsUI({ data: bills });
            await waitFor(() => screen.getByText("Mes notes de frais"));
            const newBillBtn = screen.getByTestId("btn-new-bill");
            expect(newBillBtn).toBeTruthy();
            const data = await bill.getBills();
            expect(data.length).toBe(4);
        });
    });
    describe("When an error occurs on API", () => {
        beforeEach(() => {
            jest.spyOn(mockStore, "bills");
            Object.defineProperty(window, "localStorage", {
                value: localStorageMock,
            });

            root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.appendChild(root);
            router();
        });
        test("Fetches bills from an API and fails with 404 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
                return {
                    list: () => {
                        return Promise.reject(new Error("Erreur 404"));
                    },
                };
            });
            window.onNavigate(ROUTES_PATH.Dashboard);
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 404/);
            expect(message).toBeTruthy();
        });
        test("Fetches messages from an API and fails with 500 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
                return { list: () => { return Promise.reject(new Error("Erreur 500")); }, };
            });
            window.onNavigate(ROUTES_PATH.Dashboard);
            await new Promise(process.nextTick);
            const message = screen.getByText(/Erreur 500/);
            expect(message).toBeTruthy();
        });
    });
})