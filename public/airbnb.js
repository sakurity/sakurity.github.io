var search_params_str = `_format=for_explore_search_web&adults=2&auto_ib=true&currency=EUR&current_tab_id=home_tab&fetch_filters=true&has_zero_guest_treatment=true&hide_dates_and_guests_filters=false&is_guided_search=true&is_new_cards_experiment=true&is_standard_search=true&locale=en&metadata_only=false&price_max=112&price_min=75&query_understanding_enabled=true&refinement_paths%5B%5D=%2Fhomes&selected_tab_id=home_tab&show_groupings=true`
var hunterURL = 'https://sakurity.com/airbnb.html'
hunterURL = 'http://l:4567/airbnb.html'

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
  //hunterIncrement.value
  anything_left = true
  items_offset = 0
  last_search_session_id = false
  federated_search_session_id = false


  var href = new URLSearchParams(location.href)


  var dataState = JSON.parse(document.getElementById('data-state').innerHTML)
  var api_key = dataState.bootstrapData['layout-init'].api_config.key


  var filters = dataState.bootstrapData.reduxData.exploreTab.responseFilters
  //href.get('price_min')

  while(anything_left) {
    var search_params = new URLSearchParams(search_params_str)
    search_params.set('items_per_grid', items_per_grid)
    search_params.set('items_offset', items_offset)
    search_params.set('key', api_key)


    search_params.set('place_id', href.get('place_id'))
    search_params.set('query', href.get('query'))


    search_params.set('checkin', href.get('checkin'))
    search_params.set('checkout', href.get('checkout'))

    search_params.set('ne_lat', href.get('ne_lat'))
    search_params.set('ne_lng', href.get('ne_lng'))
    search_params.set('sw_lat', href.get('sw_lat'))
    search_params.set('sw_lng', href.get('sw_lng'))

    search_params.set('adults', href.get('adults'))

    search_params.set('price_min', href.get('price_min'))
    search_params.set('price_max', href.get('price_max'))

    
    if (last_search_session_id)
    search_params.set('last_search_session_id', last_search_session_id)
    
    if (federated_search_session_id)
    search_params.set('federated_search_session_id', federated_search_session_id)
    
    console.log('offset', items_offset)

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
      console.log('final page '+section.listings.length)
      anything_left = false
    }

    hunterExport.innerHTML = `Export - `+unique_ids.length
  }


}

function exportListings() {
  w = window.open(hunterURL)
  window.addEventListener('message',function(e){
    if (e.data =='ready'){
      console.log('exporting data')
      w.postMessage(JSON.stringify({listings: exportable}), '*')
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




