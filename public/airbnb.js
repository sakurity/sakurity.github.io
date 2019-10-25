var search_params_str = prompt('base params')
var hunterURL = 'https://sakurity.com/airbnb.html'
//'http://l:4567/airbnb.html'

async function getJSON(url){
  return await fetch(url)
  .then(response => {
    return response.json()
  })
}

function extractSection(json){
  return (json.explore_tabs[0].sections).find(o=>o.section_component_type=="LISTINGS_GRID")
}

var anything_left = true
var exportable = []
var unique_ids = []

var items_offset = 0
var items_per_grid = 50
var last_search_session_id = false
var federated_search_session_id = false
var priceStep = 0

async function parsePages() {
  priceStep = prompt(`Leave empty`)

  while(anything_left) {
    var search_params = new URLSearchParams(search_params_str)
    search_params.set('items_per_grid', items_per_grid)
    search_params.set('items_offset', items_offset)
    
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
    if (section.listings.length == 50) {
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
  setTimeout(()=>{
    w.postMessage(JSON.stringify(exportable), '*')
  },1000)  
}


$('._i8vcof').innerHTML+=`<button id="hunterParse" class="_1k069il0 _1i67wnzj">Parse</button>`
hunterParse.onclick=parsePages

$('._i8vcof').innerHTML+=`<button id="hunterExport" class="_1k069il0 _1i67wnzj">Export - 0</button>`
hunterExport.onclick=exportListings



