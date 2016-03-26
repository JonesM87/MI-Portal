## MI-Portal
##### Website created to provide migration status overview for MI and allows subscription/downloading of reports as needed

SQL backend, PHP/HTML/JS front end, D3.js for visualisations

#####Node Map
The node map allows users to at a glance see the status of various systems and reports, clicking a node expands its child nodes and brings up key information in the right panel such as report owner, migration plan, report screenshot etc. Users can filter the visualisation by department removing unwanted nodes/paths, drill down one node at a time by clicking or can use the search function which highlights the path to the search results as they type. The data driving the portal comes from the teams live Excel working file which when saved fires off a VBA module which creates a JSON file and uploads the data to the web server meaning the information is always up to date. The visualisation is dynamically drawn client side using D3.

![node map 1](https://github.com/JonesM87/MI-Portal/blob/master/node1.png)
![node map 2](https://github.com/JonesM87/MI-Portal/blob/master/node2.png)

#####Subscription Page
Allows users to preview available reports, subscribe to various versions they are interested in, download the latest report or have a selection of reports emailed to them. The portal auto logs-on users using their windows username and confirms any changes made via email. The subscription process itself if asynchronous and all settings update to the database as users make selections.

![subs 1](https://github.com/JonesM87/MI-Portal/blob/master/subs1.png)
