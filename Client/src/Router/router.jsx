import { createBrowserRouter } from "react-router";
import home from "../Home/home";
import Root from "../Root";
import ErrorPage from "../ErrorPage";
import FCRDraftGenerator from "../FCRDraftGenerator";
import AllFcr from "../FCR/AllFcr";
import ProjectsDashboard from "../ProjectsDashboard/ProjectsDashboard";
import ProjectDetailPage from "../ProjectDetailPage/ProjectDetailPage";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                path: '/',
                Component: home,
            },
            {
                path: '/FcrDarftMake',
                Component: FCRDraftGenerator,
            }, {
                path: '/AllFcr',
                Component: AllFcr,

            }, {
                path: '/ProjectsDashboard',
                Component: ProjectsDashboard,

            }, {
                path: '/project/:projectId',
                Component: ProjectDetailPage
            }


        ]

    },


]);
