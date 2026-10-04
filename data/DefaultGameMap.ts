import type {GraphJSON} from "../Graph";

const DefaultGameMap: GraphJSON = {
  nodes: [
    {name: "Blue Home", data: {canRecruit: true, income: 10}},
    {name: "Blue to Center", data: {canRecruit: false, income: 2}},
    {name: "B to G", data: {canRecruit: false, income: 2}},
    {name: "B to R", data: {canRecruit: false, income: 2}},
    {name: "Red Home", data: {canRecruit: true, income: 10}},
    {name: "Red to Center", data: {canRecruit: false, income: 2}},
    {name: "R to B", data: {canRecruit: false, income: 2}},
    {name: "R to G", data: {canRecruit: false, income: 2}},
    {name: "Green Home", data: {canRecruit: true, income: 10}},
    {name: "Green to Center", data: {canRecruit: false, income: 2}},
    {name: "G to R", data: {canRecruit: false, income: 2}},
    {name: "G to B", data: {canRecruit: false, income: 2}},
    {name: "Gate RB", data: {canRecruit: false, income: 4}},
    {name: "Gate GB", data: {canRecruit: false, income: 4}},
    {name: "Gate RG", data: {canRecruit: false, income: 4}},
    {name: "Center", data: {canRecruit: true, income: 8}},
  ],
  edges: [
    ["Blue Home", "Blue to Center"],
    ["Blue Home", "B to R"],
    ["Blue Home", "B to G"],
    ["Blue to Center", "Center"],
    ["B to G", "Gate GB"],
    ["B to R", "Gate RB"],
    ["Red Home", "Red to Center"],
    ["Red Home", "R to G"],
    ["Red Home", "R to B"],
    ["Red to Center", "Center"],
    ["R to B", "Gate RB"],
    ["R to G", "Gate RG"],
    ["Green Home", "Green to Center"],
    ["Green Home", "G to B"],
    ["Green Home", "G to R"],
    ["Green to Center", "Center"],
    ["G to R", "Gate RG"],
    ["G to B", "Gate GB"],
  ],
};

export default DefaultGameMap;
