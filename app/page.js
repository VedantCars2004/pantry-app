"use client"

import { Box, Stack, Typography, Container, Paper, Button, Modal, TextField, IconButton, ThemeProvider, createTheme, Grid } from "@mui/material"
import { firestore } from "./firebase"
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import KitchenIcon from '@mui/icons-material/Kitchen'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { getRecipeRecommendations } from './ai'

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
      light: '#757de8',
      dark: '#002984',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.2rem',
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#3f51b5',
        },
      },
    },
  },
})

export default function Home() {
  const [pantry, setPantry] = useState([])
  const [open, setOpen] = useState(false)
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [recipes, setRecipes] = useState([])
  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)
  const [itemName, setItemName] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [favoriteRecipes, setFavoriteRecipes] = useState([])
  const [pantrySearch, setPantrySearch] = useState('')
  const [recipeSearch, setRecipeSearch] = useState('')

  const updatePantry = async () => {
    const snapshot = query(collection(firestore, 'pantry'))
    const docs = await getDocs(snapshot)
    const pantryList = []
    docs.forEach((doc) => {
      const data = doc.data()
      pantryList.push({ id: doc.id, quantity: data.quantity || 0 })
    })
    setPantry(pantryList)
  }

  const updateFavoriteRecipes = async () => {
    const snapshot = query(collection(firestore, 'favoriteRecipes'))
    const docs = await getDocs(snapshot)
    const recipeList = []
    docs.forEach((doc) => {
      recipeList.push({ id: doc.id, ...doc.data() })
    })
    setFavoriteRecipes(recipeList)
  }

  useEffect(() => {
    updatePantry()
    updateFavoriteRecipes()
  }, [])

  const addItem = async (item, quantity) => {
    const docRef = doc(collection(firestore, 'pantry'), item)
    await setDoc(docRef, { quantity: Number(quantity) })
    updatePantry()
  } 

  const removeItem = async (item) => {
    const docRef = doc(collection(firestore, 'pantry'), item)
    await deleteDoc(docRef)
    updatePantry()
  }

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity <= 0) {
      await removeItem(item)
    } else {
      const docRef = doc(collection(firestore, 'pantry'), item)
      await updateDoc(docRef, { quantity: Number(newQuantity) })
      updatePantry()
    }
  }

  const getRecipes = async () => {
    setIsLoading(true)
    setError(null)
    const ingredients = pantry.map(item => item.id)
    
    if (ingredients.length === 0) {
      setError('No ingredients in pantry')
      setIsLoading(false)
      return
    }
    
    try {
      const recommendedRecipes = await getRecipeRecommendations(ingredients)
      
      if (!recommendedRecipes || recommendedRecipes.length === 0) {
        setError('No recipes were returned from the API.')
        setRecipes([])
      } else if (recommendedRecipes[0].name === "Parsing Error") {
        setError('Error parsing API response. Raw response:')
        setRecipes(recommendedRecipes)
      } else {
        setRecipes(recommendedRecipes)
      }
      setRecipeModalOpen(true)
    } catch (error) {
      console.error('Error getting recipes:', error)
      setError(`Failed to get recipes. Error: ${error.message}`)
      setRecipes([])
    } finally {
      setIsLoading(false)
    }
  }

  const addToFavorites = async (recipe) => {
    const docRef = doc(collection(firestore, 'favoriteRecipes'), recipe.name)
    await setDoc(docRef, recipe)
    updateFavoriteRecipes()
  }

  const removeFromFavorites = async (recipeName) => {
    try {
      const docRef = doc(collection(firestore, 'favoriteRecipes'), recipeName)
      await deleteDoc(docRef)
      console.log(`Recipe "${recipeName}" removed from favorites`)
      setFavoriteRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.name !== recipeName))
    } catch (error) {
      console.error("Error removing favorite recipe:", error)
    }
  }

  const filteredPantry = pantry.filter(item => 
    item.id.toLowerCase().includes(pantrySearch.toLowerCase())
  )

  const filteredFavoriteRecipes = favoriteRecipes.filter(recipe => 
    recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
    recipe.ingredients.some(ing => ing.toLowerCase().includes(recipeSearch.toLowerCase()))
  )

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{
            p: 4,
            mb: 6,
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            bgcolor: 'primary.main',
            color: 'white'
          }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              <KitchenIcon sx={{ fontSize: 30, mr: 2 }} />
              Smart Pantry
            </Typography>
            <Typography variant="h6" mt={2}>
              Your Intelligent Kitchen Assistant with AI Recipes
            </Typography>
          </Box>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <Box 
                  bgcolor="primary.main" 
                  color="white" 
                  p={3} 
                >
                  <Typography variant="h5" fontWeight="bold" mb={2}>
                    Pantry Items
                  </Typography>
                  <Grid display={'flex'} justifyContent={'space-between'}>
                  <TextField
                    variant="outlined"
                    placeholder="Search pantry items..."
                    value={pantrySearch}
                    onChange={(e) => setPantrySearch(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'transparent' },
                        '&:hover fieldset': { borderColor: 'transparent' },
                        '&.Mui-focused fieldset': { borderColor: 'transparent' },
                      },
                    }}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleOpen} 
                    size="large"
                    sx={{ 
                      mt: 2,
                      bgcolor: 'white', 
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'primary.light', color: 'white' },
                      fontWeight: 'bold',
                      px: 3,
                    }}
                  >
                    Add Item
                  </Button>
                  </Grid>
                </Box>
                
                <Box p={4} sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <Stack spacing={3}>
                    {filteredPantry.length > 0 ? (
                      filteredPantry.map((item) => (
                        <Paper
                          key={item.id}
                          elevation={0}
                          sx={{
                            p: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            },
                            borderRadius: 3,
                            bgcolor: 'background.default',
                          }}
                        >
                          <Typography variant="body1" fontWeight="500">
                            {item.id.charAt(0).toUpperCase() + item.id.slice(1)}
                          </Typography>
                          <Box display="flex" alignItems="row" alignContent={'row'}>
                            <IconButton onClick={() => updateQuantity(item.id, item.quantity - 1)} size="small" sx={{ bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}>
                              <RemoveIcon />
                            </IconButton>
                            <Typography variant="body1" sx={{ mx: 2, minWidth: '24px', textAlign: 'center', fontWeight: 'bold' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton onClick={() => updateQuantity(item.id, item.quantity + 1)} size="small" sx={{ bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}>
                              <AddIcon  />
                            </IconButton>
                            <IconButton onClick={() => removeItem(item.id)} color="error" size="small" sx={{ ml: 2 }} >
                            <DeleteOutlineIcon />
                            </IconButton>
                          </Box>
                        </Paper> 
                      ))
                    ) : (
                      <Typography variant="body1" color="text.secondary" textAlign="center">
                        No matching items in the pantry.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <Box 
                  bgcolor="secondary.main" 
                  color="white" 
                  p={3} 
                >
                  <Typography variant="h5" fontWeight="bold" mb={2}>
                    My Favorite Recipes
                  </Typography>
                  <Grid justifyContent={'space-between'} display={'flex'}>
                  <TextField
                    variant="outlined"
                    placeholder="Search recipes..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: 1,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'transparent' },
                        '&:hover fieldset': { borderColor: 'transparent' },
                        '&.Mui-focused fieldset': { borderColor: 'transparent' },
                      },
                    }}
                  />
                  {pantry.length > 0 && (
                    <Button 
                      variant="contained" 
                      onClick={getRecipes}
                      disabled={isLoading}
                      sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
                    >
                      {isLoading ? 'Getting Recipes...' : `Get Recipes with AI (${pantry.length})`}
                    </Button>
                    
                  )}
                  </Grid>
                
                  {error && (
                    <Typography color="error" textAlign="center" mt={2} variant="body2">
                      {error}
                    </Typography>
                  )}
                </Box>
                
                <Box p={4} sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <Stack spacing={3}>
                    {filteredFavoriteRecipes.length > 0 ? (
                      filteredFavoriteRecipes.map((recipe) => (
                        <Paper
                          key={recipe.id}
                          elevation={0}
                          sx={{
                            p: 3,
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                            },
                            borderRadius: 3,
                            bgcolor: 'background.default',
                          }}
                        >
                          <Typography variant="h6" fontWeight="bold" mb={1}>
                            {recipe.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" mb={2}>
                            Ingredients: {recipe.ingredients.join(', ')}
                          </Typography>
                          <Accordion sx={{ width: '100%', overflow: 'hidden' }}>
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    aria-controls="panel1a-content"
    id="panel1a-header"
  >
    <Typography variant="subtitle1" fontWeight="bold">Instructions</Typography>
  </AccordionSummary>
  <AccordionDetails sx={{ overflowX: 'auto', maxWidth: '100%' }}>
    <ol style={{ paddingInlineStart: '20px', margin: 0 }}>
      {recipe.instructions.map((step, idx) => (
        <li key={idx} style={{ marginBottom: '8px' }}>{step}</li>
      ))}
    </ol>
  </AccordionDetails>
</Accordion>
<IconButton
  onClick={() => removeFromFavorites(recipe.id)}
  color="error"
  size="small"
  sx={{ mt: 1 }}
>
  <DeleteOutlineIcon />
</IconButton>
</Paper>
))
) : (
<Typography variant="body1" color="text.secondary" textAlign="center">
  No matching favorite recipes.
</Typography>
)}
</Stack>
</Box>
</Paper>
</Grid>
</Grid>

<Modal 
open={open} 
onClose={handleClose} 
aria-labelledby="modal-modal-title" 
aria-describedby="modal-modal-description"
>
<Box sx={{ 
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 450,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
}}> 
  <Typography id="modal-modal-title" variant="h5" component="h2" mb={3} fontWeight="bold">
    Add Item to Pantry
  </Typography>
  <Stack spacing={3}>
    <TextField 
      label="Item Name" 
      variant="outlined" 
      fullWidth={true} 
      value={itemName} 
      onChange={(e) => setItemName(e.target.value)}
      size="medium"
    />
    <TextField 
      label="Quantity" 
      variant="outlined" 
      type="number" 
      fullWidth={true} 
      value={itemQuantity} 
      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
      inputProps={{ min: 1 }}
      size="medium"
    />
    <Button 
      variant="contained" 
      onClick={() => {
        if (itemName.trim() !== '') {
          addItem(itemName.trim(), itemQuantity)
          setItemName('')
          setItemQuantity(1)
          handleClose()
        }
      }}
      sx={{ py: 1.5, fontWeight: 'bold' }}
    >
      Add Item
    </Button>
  </Stack>
</Box>
</Modal>

<Modal 
open={recipeModalOpen} 
onClose={() => setRecipeModalOpen(false)} 
aria-labelledby="recipe-modal-title" 
aria-describedby="recipe-modal-description"
>
<Box sx={{ 
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  maxHeight: '80vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
}}> 
  <Typography id="recipe-modal-title" variant="h5" component="h2" mb={3} fontWeight="bold" color="black">
    Recipe Recommendations
  </Typography>
  <Stack spacing={3}>
    {recipes.length > 0 ? (
      recipes[0].name === "Parsing Error" ? (
        <Typography variant="body2" color="text.secondary">
          {error}
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {recipes[0].ingredients[0]}
          </pre>
        </Typography>
      ) : (
        recipes.map((recipe, index) => (
          <Paper key={index} elevation={0} sx={{ p: 3, transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)' }, borderRadius: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" fontWeight="bold" mb={1}>{recipe.name}</Typography>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>Ingredients:</Typography>
            <ul>
              {recipe.ingredients.map((ingredient, idx) => (
                <li key={idx}>{ingredient}</li>
              ))}
            </ul>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header"
              >
                <Typography variant="subtitle1" fontWeight="bold">Instructions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ol>
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </AccordionDetails>
            </Accordion>
            <Button
              variant="outlined"
              startIcon={<FavoriteIcon />}
              onClick={() => addToFavorites(recipe)}
              sx={{ 
                mt: 2, 
                borderColor: 'secondary.main', 
                color: 'secondary.main',
                '&:hover': { 
                  backgroundColor: 'secondary.light',
                  borderColor: 'secondary.main',
                  color: 'white',
                }
              }}
              size="large"
            >
              Add to Favorites
            </Button>
          </Paper>
        ))
      )
    ) : (
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {error || "No recipes found. Our AI couldn't generate recipes with the current ingredients. Try adding more varied ingredients to your pantry."}
      </Typography>
    )}
  </Stack>
</Box> 
</Modal>
</Container>
</Box>
</ThemeProvider>
);
}