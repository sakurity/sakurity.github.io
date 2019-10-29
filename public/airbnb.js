/* Airbnb Hunter - find top rated Airbnb apartments

Before: up to 306 rated by vague and inconsistent internal Airbnb ranking algorithm. No sorting opportunities - you are shown what they decide to show you.

With this tool: Extract thousands of listings in a popular city, then sort by price, review count or average rating. 

Step 1.
Select specific city on airbnb.com and use as many filters as possible. You must set min and max price. Also move the map so URL contains sw_lat/lng params

Step 2.
Execute code below in web console on that page

Step 3. 
Airbnb never returns more than 306 listings in one search, so we have to split our searches in price ranges.
Select price step to split and scan through large database ($10-$50).
If you get up to 5 pages during the scan sometimes, use smaller price step.

Step 4. 
Move the map and scan again to add another neighborhood. In the end, export the listings and further fine tune your requirements on another page
*/
var hunterURL = 'https://sakurity.com/airbnb.html'
//hunterURL = 'http://l:4567/airbnb.html'

async function getJSON(url){
  return await fetch(url)
  .then(response => {
    return response.json()
  })
}

function extractSection(json){
  return (json.explore_tabs[0].sections).find(o=>o.section_component_type=="LISTINGS_GRID")
}

var exportable = []
var unique_ids = []

var anything_left = true
var items_offset = 0
var items_per_grid = 50
var last_search_session_id = false
var federated_search_session_id = false


async function parsePages() {
  anything_left = true
  items_offset = 0
  last_search_session_id = false
  federated_search_session_id = false


  var href = new URLSearchParams(location.href)

  var increment = Number(hunterIncrement.value)
  var current_price_min = Number(href.get('price_min'))
  var final_price_max = Number(href.get('price_max'))

  if (increment == 0) {
    var current_price_max = final_price_max
  } else {
    var current_price_max = current_price_min + increment  
  }


  var dataState = JSON.parse(document.getElementById('data-state').innerHTML)
  var api_key = dataState.bootstrapData['layout-init'].api_config.key


  //var filters = dataState.bootstrapData.reduxData.exploreTab.responseFilters
  //href.get('price_min')

  while(anything_left) {
    var search_params = new URLSearchParams(location.href)
    search_params.set('items_per_grid', items_per_grid)
    search_params.set('items_offset', items_offset)
    search_params.set('key', api_key)

    var clone = ['search_by_map', 'zoom', 'current_tab_id', 'selected_tab_id', 'room_types[]', 'ib', 'place_id', 'query', 'checkin', 'checkout', 'ne_lat', 'ne_lng', 'sw_lat', 'sw_lng', 'adults', 'infants', 'children', 'min_bedrooms', 'min_bathrooms', 'min_beds']
    for (var str of clone){
      if (href.get(str) != null)
      search_params.set(str, href.get(str))
    }

    search_params.set('price_min', current_price_min)
    search_params.set('price_max', current_price_max)
    
    if (last_search_session_id)
    search_params.set('last_search_session_id', last_search_session_id)
    
    if (federated_search_session_id)
    search_params.set('federated_search_session_id', federated_search_session_id)
    
    hunterParse.innerHTML = `Page `+(items_offset/items_per_grid)+' range '+current_price_min+'..'+current_price_max+' page ' 


    var json = await getJSON('https://www.airbnb.com/api/v2/explore_tabs?'+search_params.toString())
    var section = extractSection(json) 
    if (section.listings.length > 0) {
      for (let l of section.listings) {
        if (unique_ids.indexOf(l.listing.id) == -1) {        
          l.listing.pricing_quote = l.pricing_quote 
          exportable.push(l.listing)

          unique_ids.push(l.listing.id)
        }
      }
    }

    //document.findbyid update count

    // last page
    if (json.explore_tabs[0].pagination_metadata.has_next_page) {
      items_offset += items_per_grid

      last_search_session_id = section.search_session_id
      federated_search_session_id = json.metadata.federated_search_session_id
    } else {
      if (current_price_max < final_price_max) {
        current_price_min += increment
        current_price_max += increment

        // gone too far
        if (current_price_max > final_price_max) {
          current_price_max = final_price_max
        }

        items_offset = 0
      } else {
        anything_left = false
        hunterParse.innerHTML = 'Parse'
      }
    }

    hunterExport.innerHTML = `Export - `+unique_ids.length
  }


}

function exportListings() {
  w = window.open(hunterURL)
  window.addEventListener('message',function(e){
    if (e.data =='ready'){
      console.log('exporting data')
      w.postMessage(JSON.stringify({listings: exportable, href: location.href.split('?')[1]}), '*')
    }
  })
}

var div = document.createElement('div')
div.innerHTML =`<div style="position:fixed;left:45%;top:0px;z-index:99999;background-color: yellow;  padding: 20px;">
<input style="width:50px" id="hunterIncrement" placeholder="Increments" value="0"> 
<a href="#" id="hunterParse">Parse</a> | 
<a href="#" id="hunterExport">Export - 0</a>
</div>`
document.body.appendChild(div)
hunterParse.onclick=parsePages
hunterExport.onclick=exportListings




